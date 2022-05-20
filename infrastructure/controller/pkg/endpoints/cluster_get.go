package endpoints

import (
	"encoding/json"
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/airyhq/airy/lib/go/kubectl/configmaps"
	"k8s.io/client-go/kubernetes"
)

type ClusterGet struct {
	clientSet *kubernetes.Clientset
	namespace string
}

func (s *ClusterGet) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	components, err := configmaps.GetComponentsConfigMaps(r.Context(), s.namespace, s.clientSet, maskSecrets)
	if err != nil {
		log.Printf(err.Error())
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	blob, err := json.Marshal(map[string]interface{}{"components": components})
	if err != nil {
		log.Printf("Unable to marshal config Error: %s\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(blob)
}

func getComponentFromLabel(l string) (string, string, bool) {
	c := strings.Split(l, "-")
	if len(c) != 2 {
		return "", "", false
	}

	return c[0], c[1], true
}

var secretMatcher = regexp.MustCompile(`(?i)secret|key|token`)

func maskSecrets(data map[string]string) map[string]string {
	mask := func(s string) string {
		if len(s) < 2 {
			return "..."
		}

		if len(s) > 8 {
			return s[:4] + "..."
		}

		return s[:1] + "..."
	}
	out := make(map[string]string, len(data))

	for k, v := range data {
		if k == "saFile" {
			out[k] = "<service account keys>"
		} else if secretMatcher.MatchString(k) {
			out[k] = mask(v)
		} else {
			out[k] = v
		}
	}

	return out
}
